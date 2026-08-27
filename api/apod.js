export default async function handler(req, res) {
  const { date } = req.query;
  const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
  let url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

  if (date) {
    url += `&date=${date}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error fetching APOD data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
