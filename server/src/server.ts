import "dotenv/config";

import app from "./app.js";

// The host (e.g. Railway) sets PORT; 3000 for local development
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});