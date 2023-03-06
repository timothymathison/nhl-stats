export const getLocalISODate = () => {
  const currentTime = new Date();
  const timeZoneOffset = currentTime.getTimezoneOffset() * 60 * 1000;
  return new Date(currentTime - timeZoneOffset).toISOString().split("T")[0];
};

export const validateDate = date => {
  if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.error(`Date: ${date} is not a valid date`);
    process.exit(1);
  }
  return true;
};

export const validateSeason = season => {
  if (season && (!season.match(/^\d{8}$/) || parseInt(season.slice(0, 4)) + 1 !== parseInt(season.slice(4)))) {
    console.error(`Season ${season} is not a valid season`);
    process.exit(1);
  }
  return true;
};

// removes undefined object properties
export const compact = obj => {
  Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
  return obj;
};
