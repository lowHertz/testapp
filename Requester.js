const API_URL = 'http://80.242.58.239:8080',
API_VERSION = 'v1';

// *** DEBUG MODE
const READY_RESPONSES = {
    post: {
        users: {
            balance: 1000
        },
        game: {
            gameId: 1,
            canStartGame: true,
            calculatedResult: 500
        },
        'game/result': {
            ok: true
        },
        'payments/ton': {
            destinationAddress: 'fj0DJ3HDKjdksdjljh0239hg',
            transactionComment: '{TELEGRAM_ID}|REPLENISH|{AMOUNT}',
            readyUrl: 'http://80.242.58.239:8080/swagger/index.html'
        },
        withdraws: {
            ok: true
        }
    },
    get: {
        'payments/ton/rate': {
            tonToCoinsMultiplier: 10
        }
    }
};
const games = (new Array(35)).fill().map((_,i) => ({
    id: i,
    betSize: 500 * Math.random(),
    multiplier: Math.random() + 1,
    result: 500 * 2
}));
// ***

export default function (path, method, data) {
    console.log(path, window.DEBUG_MODE);

    if(window.DEBUG_MODE) {
        if(path.includes('top-results')) {
            const { Take, Skip } = Object.fromEntries(path.split('?')[1].split('&').map(x => x.split('=')));
    
            return { items: games.slice(+Skip, +Skip + +Take) };
        } else return READY_RESPONSES[method][path];
    } else return fetch(
        `${API_URL}/api/${API_VERSION}/${path}`,
        {
            method,
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            body: data ? JSON.stringify(data) : undefined
        }
    ).then(res => res.json());
};