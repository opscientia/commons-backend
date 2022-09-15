import app from './index';
const PORT = 3005;
try {
    app.listen(PORT, () => {
        console.log(`Server is running on http://127.0.0.1:${PORT}`)
    })
} catch (error) {
    console.error(error);
}
