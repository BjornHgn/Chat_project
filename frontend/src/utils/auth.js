export const isTokenValid = (token) => {
  try {
    // JWT tokens consist of three parts: header.payload.signature
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedPayload.exp > currentTime;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};