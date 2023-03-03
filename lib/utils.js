export const getLocalISODate = () => {
  const currentTime = new Date();
  const timeZoneOffset = currentTime.getTimezoneOffset() * 60 * 1000;
  return new Date(currentTime - timeZoneOffset).toISOString().split("T")[0];
};
