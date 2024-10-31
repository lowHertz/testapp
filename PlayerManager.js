import Requester from "./Requester.js";

export default class {
    id;
    balance;

    async init (telegramId) {
        if(!telegramId) return true;

        this.id = telegramId || 0;

        this.balance = await this.getBalance();
    };

    async createGame (amount) {
        const { gameId, calculatedResult } = await Requester(
            'game',
            'post',
            { telegramId: this.id, betSize: amount }
        );

        return [gameId, calculatedResult];
    };

    sendGameResult (gameId, result) {
        Requester(
            'game/result',
            'post',
            { telegramId: this.id, gameId, factResult: result }
        );
    };

    getTopGames (take, skip) {
        return Requester(
            `game/top-results?Take=${take}&Skip=${skip}`,
            'get',
            { accept: 'application/json' }
        );
    };

    getTonRate () {
        return Requester('payments/ton/rate', 'get', { accept: 'application/json', 'content-type': 'application/json' });
    };

    async getBalance () {
        return +(await Requester(
            'users',
            'post',
            { telegramId: this.id }
        )).balance.toFixed(2);
    };

    createPayment (amount) {
        return Requester(
            'payments/ton',
            'post',
            { telegramId: this.id, depositSize: amount }
        );
    };

    createWithdraw (amount) {
        return Requester(
            'withdraws',
            'post',
            { telegramId: this.id, amount, address: 'fsdffasf' }
        );
    };
};