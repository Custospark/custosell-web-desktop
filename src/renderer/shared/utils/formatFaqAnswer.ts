export function formatFaqAnswer(answer: string): string {
  return answer
    .replace(/\\n/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1');
}
