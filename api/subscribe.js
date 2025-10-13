let subscriptions = [];

module.exports = (req, res) => {
  if (req.method === 'POST') {
    subscriptions.push(req.body);
    res.status(201).json({ message: 'Subscribed' });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};