const routes = [
  '/',
  '/soukromi',
  '/podminky',
  '/api/auth-status',
  '/api/feed',
  '/api/explore',
  '/api/verejne-vylety',
  '/api/akce',
  '/api/ulozene-vylety',
  '/api/moje-info',
  '/api/moje-staty',
  '/api/notifikace',
  '/api/moji-pratele',
  '/api/profil/123',
  '/api/sdileny-vylet/123',
  '/api/zpravy/123',
  '/api/public-trip/abc',
  '/api/u/test',
  '/api/qr/123',
  '/s/abc',
  '/u/test',
  '/auth/google',
  '/auth/logout'
];

async function checkRoute(route) {
    try {
        // Zkusíme primárně IPv4 (127.0.0.1), jako fallback localhost
        const url = `http://127.0.0.1:3000${route}`;
        const response = await fetch(url);
        const status = response.status;
        
        let message = '';
        if (status >= 200 && status < 300) message = 'OK';
        else if (status >= 300 && status < 400) message = 'Redirect';
        else if (status >= 400 && status < 500) message = 'Chyba klienta / Nenalezeno';
        else if (status >= 500) message = 'Chyba serveru';
        else message = 'Jiné';

        const icon = (status >= 200 && status < 400) ? '✅' : '❌';
        console.log(`${icon} ${route} - Status ${status} (${message})`);
        
        // Zahození těla odpovědi
        await response.text(); 
    } catch (error) {
        // Fallback k localhost (IPv6)
        try {
            const url2 = `http://localhost:3000${route}`;
            const response2 = await fetch(url2);
            const status2 = response2.status;
            
            let message2 = '';
            if (status2 >= 200 && status2 < 300) message2 = 'OK';
            else if (status2 >= 300 && status2 < 400) message2 = 'Redirect';
            else if (status2 >= 400 && status2 < 500) message2 = 'Chyba klienta / Nenalezeno';
            else if (status2 >= 500) message2 = 'Chyba serveru';
            else message2 = 'Jiné';

            const icon2 = (status2 >= 200 && status2 < 400) ? '✅' : '❌';
            console.log(`${icon2} ${route} - Status ${status2} (${message2}) (přes localhost)`);
            await response2.text();
        } catch (err2) {
            console.log(`❌ ${route} - Nelze se připojit k serveru (ani na 127.0.0.1 ani na localhost)`);
        }
    }
}

async function runTests() {
    console.log('🚀 Spouštím Health Check GET rout na portu 3000...\n');
    for (const route of routes) {
        await checkRoute(route);
    }
    console.log('\n🏁 Health Check dokončen.');
}

runTests();
