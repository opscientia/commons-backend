const app = require('./index')

const PORT = 3005
app.listen(PORT, (err: any) => {
    if (err) throw err
    console.log(`Server is running on http://127.0.0.1:${PORT}`)
})
