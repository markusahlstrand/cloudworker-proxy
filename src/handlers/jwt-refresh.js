module.exports = async function refreshAccessToken({
  refreshToken,
  authDomain,
  clientId,
  clientSecret,
}) {
  const tokenUrl = `${authDomain}/oauth/token`;

  // eslint-disable-next-line no-undef
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const body = await response.json();

  return {
    accessToken: body.access_token,
    refreshToken,
    expires: Date.now() + body.expires_in * 1000,
  };
};
