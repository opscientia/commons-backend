const PORT = 3005;
export default class Server {
    start(PORT: number){
        const app = require('./index')
        app.listen(PORT, (err: any) => {
            if (err) throw err
            console.log(`Server is running on http://127.0.0.1:${PORT}`)
        })
    }
}