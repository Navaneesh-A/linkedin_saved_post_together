const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'posts.json');
const posts = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Add remind: false to every post that doesn't have it
const updatedPosts = posts.map(post => ({
    ...post,
    remind: post.hasOwnProperty('remind') ? post.remind : false
}));

fs.writeFileSync(dbPath, JSON.stringify(updatedPosts, null, 2));
console.log("Successfully updated posts.json with 'remind' attribute.");