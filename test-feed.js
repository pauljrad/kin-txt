async function run() {
    try {
        const url = "https://theconversation.com/uk/articles.atom";
        const resp = await fetch(url);
        const xml = await resp.text();

        const entries = xml.split('<entry>');
        entries.shift();

        if (entries.length > 0) {
            const entry = entries[0];
            console.log("--- ENTRY SNIPPET ---");
            console.log(entry.substring(0, 800)); // Increased snippet size
            console.log("--- AUTHOR CHECKS ---");
            
            // Regex from backend
            const regex = /<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/i;
            const match = entry.match(regex);
            console.log("Regex Match:", match ? match[1] : "NO MATCH");

            // Simple search to see what's actually there
            const authStart = entry.indexOf('<author>');
            if (authStart !== -1) {
                const authEnd = entry.indexOf('</author>', authStart);
                console.log("Actual Author Block:", entry.substring(authStart, authEnd + 9));
            } else {
                console.log("Actual Author Block: NONE FOUND");
            }
        } else {
            console.log("No entries found");
        }
    } catch (e) {
        console.error(e);
    }
}
run();
