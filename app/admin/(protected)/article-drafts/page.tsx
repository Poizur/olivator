// AI Article Drafty — sloučeny do /admin/articles?tab=drafts.
// Tato route přesměrovává pro zpětnou kompatibilitu (přímé URL, záložky).

import { redirect } from 'next/navigation'

export default function ArticleDraftsRedirect() {
  redirect('/admin/articles?tab=drafts')
}
