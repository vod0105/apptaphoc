const express = require('express');
const webpush = require('web-push');
const app = express();
app.use(express.json());

const vapidKeys = {
  publicKey: 'BDfslfjskfjs3qq982347387',
  privateKey: 'jsfjsdkji3ru3224287sf'
};
webpush.setVapidDetails('mailto:your-email@domain.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.post('/send-notification', (req, res) => {
  const { subscription, title, body, url } = req.body;
  webpush.sendNotification(subscription, JSON.stringify({
    title: title,
    body: body,
    url: url
  })).then(() => res.status(200).json({ message: 'Gửi thành công' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.listen(3001, () => console.log('Server chạy trên port 3001'));