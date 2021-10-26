const nock = require('nock');

const getUUID = () => Math.random().toString(36).substring(7);

const mockGetUserFromToken = (userProfile) => {
    nock(process.env.GATEWAY_URL, { reqheaders: { authorization: 'Bearer abcd' } })
        .get('/auth/user/me')
        .reply(200, userProfile);
};

module.exports = {
    mockGetUserFromToken,
    getUUID
};
