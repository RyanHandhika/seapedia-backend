import app from "./app.js";
import http from "http";

const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 4000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
