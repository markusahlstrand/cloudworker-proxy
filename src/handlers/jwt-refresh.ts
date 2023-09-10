export default async function refreshAccessToken({
  // eslint-disable-next-line camelcase
  refresh_token,
  authDomain,
  clientId,
  clientSecret,
}) {
  const tokenUrl = `${authDomain}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const body = await response.json();

  return {
    ...body,
    expires: Date.now() + body.expires_in * 1000,
    refresh_token,
  };
}
