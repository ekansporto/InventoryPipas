export default function handler(req, res) {
    console.log('VERCEL DEBUG - request url:', req.url);
    console.log('VERCEL DEBUG - headers:', JSON.stringify(req.headers));
    res.status(200).send('ok');
}
