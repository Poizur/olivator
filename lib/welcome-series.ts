import { render } from '@react-email/render'
import React from 'react'
import { supabaseAdmin } from './supabase'
import { sendTransactionalEmail } from './newsletter-sender'
import { Welcome2MethodologyEmail } from '@/emails/welcome-2-methodology'
import { Welcome3TopPicksEmail, type TopPickProduct } from '@/emails/welcome-3-top-picks'

export async function enqueueWelcomeSeries(subscriberId: string): Promise<void> {
  const now = new Date()
  await supabaseAdmin.from('welcome_series_queue').insert([
    {
      subscriber_id: subscriberId,
      email_number: 2,
      scheduled_for: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      subscriber_id: subscriberId,
      email_number: 3,
      scheduled_for: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ])
}

async function getTopPicks(): Promise<TopPickProduct[]> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, image_url, olivator_score, acidity, polyphenols, brand_slug')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(50)

  if (!products) return []

  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name')

  const retailerMap = new Map((retailers ?? []).map(r => [r.id as string, { slug: r.slug as string, name: r.name as string }]))

  const result: TopPickProduct[] = []

  for (const p of products) {
    if (result.length >= 5) break

    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, retailer_id')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .lte('price', 400)
      .order('price', { ascending: true })
      .limit(1)

    if (!offers || offers.length === 0) continue

    const offer = offers[0]
    const retailer = retailerMap.get(offer.retailer_id as string)
    if (!retailer) continue

    result.push({
      slug: p.slug as string,
      name: p.name as string,
      brandName: p.name_short as string | null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      acidity: p.acidity as number | null,
      polyphenols: p.polyphenols as number | null,
      price: Math.round(offer.price as number),
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      originCountry: null,
    })
  }

  return result
}

export async function dispatchWelcomeQueue(): Promise<{ sent: number; failed: number }> {
  const { data: pending } = await supabaseAdmin
    .from('welcome_series_queue')
    .select(`
      id, email_number, subscriber_id,
      newsletter_signups!inner(email, unsubscribe_token)
    `)
    .eq('sent', false)
    .lte('scheduled_for', new Date().toISOString())

  let sent = 0
  let failed = 0

  for (const item of pending ?? []) {
    const signup = (item as unknown as { newsletter_signups: { email: string; unsubscribe_token: string } }).newsletter_signups
    const unsubUrl = `https://olivator.cz/api/newsletter/unsubscribe?token=${signup.unsubscribe_token}`

    try {
      let subject: string
      let html: string
      let text: string

      if (item.email_number === 2) {
        subject = 'Jak vybíráme oleje (a proč nám můžeš věřit)'
        html = await render(React.createElement(Welcome2MethodologyEmail, { unsubscribeUrl: unsubUrl }))
        text = await render(React.createElement(Welcome2MethodologyEmail, { unsubscribeUrl: unsubUrl }), { plainText: true })
      } else {
        const products = await getTopPicks()
        subject = '5 olejů, které si teď zaslouží pozornost'
        html = await render(React.createElement(Welcome3TopPicksEmail, { unsubscribeUrl: unsubUrl, products }))
        text = await render(React.createElement(Welcome3TopPicksEmail, { unsubscribeUrl: unsubUrl, products }), { plainText: true })
      }

      const result = await sendTransactionalEmail({ to: signup.email, subject, html, text })
      if (!result.ok) throw new Error(result.error ?? 'send failed')

      await supabaseAdmin
        .from('welcome_series_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', item.id)

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabaseAdmin
        .from('welcome_series_queue')
        .update({ error_message: msg.slice(0, 500) })
        .eq('id', item.id)
      failed++
      console.error(`[welcome-series] item ${item.id} failed:`, msg)
    }
  }

  return { sent, failed }
}
