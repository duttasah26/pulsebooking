import db from './db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    db.query('SELECT * FROM rooms', (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(200).json(results);
    });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
