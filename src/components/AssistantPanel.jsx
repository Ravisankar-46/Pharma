import { useState } from 'react'
import { getExpiryLabel, isReturnEligible } from '../services/pharmacyService'

const prompts = ['Which medicines expire within 30 days?', 'Which returns are pending?', 'What did I sell today?']

function answerQuestion(question, { role, medicines, returns, sales, profile }) {
  const text = question.toLowerCase()
  if (role === 'DISTRIBUTOR') {
    const pending = returns.filter((item) => !['RECEIVED', 'DISPUTE'].includes(item.status))
    if (text.includes('discrep') || text.includes('dispute')) return pending.length ? `${returns.filter((item) => item.status === 'DISPUTE').length} return(s) have a recorded discrepancy.` : 'There are no recorded discrepancies.'
    if (text.includes('collection') || text.includes('pickup')) return `${pending.length} return(s) need collection or verification.`
    if (text.includes('status') && text.includes('pan005')) { const item = returns.find((entry) => entry.batchNumber === 'PAN005'); return item ? `PAN005 is ${item.status.replaceAll('_', ' ').toLowerCase()}.` : 'I could not find PAN005 in the shared return ledger.' }
    return `${returns.length} pharmacy return records are available in your distributor workspace.`
  }
  if (text.includes('expire') || text.includes('return')) {
    const active = new Set(returns.filter((item) => item.status !== 'RECEIVED' && item.status !== 'DISPUTE').map((item) => item.medicineId))
    const items = medicines.filter((medicine) => isReturnEligible(medicine, active))
    return items.length ? `${items.map((item) => `${item.medicineName} (${getExpiryLabel(item.expiryDate)})`).join(', ')} need return attention.` : 'No batches currently need a return.'
  }
  if (text.includes('stock') || text.includes('how many')) return `${medicines.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} units are currently visible across ${medicines.length} batches.`
  if (text.includes('sold') || text.includes('sales')) return `${sales.length} completed sale(s) are recorded in this pharmacy workspace.`
  if (text.includes('shop') || text.includes('name')) return `${profile?.shopName || profile?.pharmacyName || 'Your pharmacy'} is the active workspace.`
  return 'I can answer questions about stock, expiry, returns, sales, and this workspace.'
}

export default function AssistantPanel({ role, medicines = [], returns = [], sales = [], profile }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Ask about your live workspace data.')
  function ask(value = question) { if (!value.trim()) return; setAnswer(answerQuestion(value, { role, medicines, returns, sales, profile })); setQuestion('') }
  return <><button type="button" className="assistant-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open}><span className="assistant-spark">✦</span> AI Assistant</button>{open && <aside className="assistant-panel" aria-label="Read-only AI Assistant"><div className="assistant-header"><div><p className="eyebrow">PharmaLoop intelligence</p><strong>Workspace assistant</strong><small>Read-only operational answers</small></div><button type="button" className="icon-button" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button></div><div className="assistant-body"><div className="assistant-message"><span className="assistant-spark">✦</span><p>{answer}</p></div><div className="assistant-prompts">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div></div><form className="assistant-form" onSubmit={(event) => { event.preventDefault(); ask() }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your workspace" aria-label="Ask the assistant" /><button type="submit" aria-label="Ask assistant">→</button></form></aside>}</>
}
