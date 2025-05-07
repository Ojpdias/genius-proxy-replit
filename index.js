const express = require('express')
const axios = require('axios')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())

app.get('/api/lyrics', async (req, res) => {
  const { track, artist } = req.query
  const token = process.env.GENIUS_ACCESS_TOKEN

  if (!token) return res.status(500).json({ error: 'GENIUS_ACCESS_TOKEN não definido' })
  if (!track || !artist) return res.status(400).json({ error: 'Track e artist obrigatórios' })

  try {
    const search = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(track + ' ' + artist)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const hits = search.data.response.hits
    const song = hits.find(hit =>
      hit.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase())
    )

    if (!song) return res.status(404).json({ error: 'Música não encontrada' })

    const lyricsPage = await axios.get(song.result.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })

    const html = lyricsPage.data
    let match = html.match(/<div[^>]+data-lyrics-container[^>]*>([\s\S]*?)<\/div>/g)

    if (!match || match.length === 0) {
      const old = html.match(/<div class="lyrics">([\s\S]*?)<\/div>/)
      if (old && old[1]) {
        return res.status(200).json({ lyrics: old[1].replace(/<[^>]+>/g, '').trim() })
      }
      return res.status(404).json({ error: 'Não foi possível extrair a letra' })
    }

    const raw = match.map(s => s.replace(/<[^>]+>/g, '').trim()).join('\n')
    res.status(200).json({ lyrics: raw })
  } catch (err) {
    res.status(500).json({ error: 'Erro na requisição', details: err.message })
  }
})

app.get('/', (req, res) => res.send('Lyrics Proxy Online'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))