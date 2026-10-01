export const QUOTES = [
  { text: 'Kdor dela, ne trpi.', author: 'Slovenski pregovor' },
  { text: 'Dobra misel je dobra polovica dela.', author: 'Slovenski pregovor' },
  { text: 'Čas zdravi vse rane.', author: 'Slovenski pregovor' },
  { text: 'Na koncu se vse izplača.', author: 'Slovenski pregovor' },
  { text: 'Brez dela ni zore.', author: 'Slovenski pregovor' },
  { text: 'V velikem križu je veliko odre.', author: 'Slovenski pregovor' },
  { text: 'Kdor drugemu jamo koplje, sam v njo pade.', author: 'Slovenski pregovor' },
  { text: 'Človek ne more vedeti, ampak mora.', author: 'Slovenski pregovor' },
  { text: 'Znanje je moč.', author: 'Konfucij' },
  { text: 'Več ljudi je ubilo z besedo kakor z mečem.', author: 'Konfucij' },
  { text: 'Mislim, torej sem.', author: 'Rene Descart' },
  { text: 'Vsak človek je sosed drugemu človeku.', author: 'Henrik Ibsen' },
  { text: 'Živi, kot da je danes tvoj zadnji dan.', author: 'Mahatma Gandhi' },
  { text: 'Sreča je doma.', author: 'Slovenski pregovor' },
  { text: 'Človek mora delati, če hoče živeti.', author: 'Slovenski pregovor' },
  { text: 'Kdor zgodaj vstane, dvakrat bere.', author: 'Slovenski pregovor' }
]

export const getQuoteOfTheDay = (date = new Date()) => {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - startOfYear) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}
