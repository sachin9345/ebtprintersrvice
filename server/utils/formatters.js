function padRight(text = "", length) {
  return text.length > length
    ? text.slice(0, length)
    : text + " ".repeat(length - text.length);
}

function padLeft(text = "", length) {
  return text.length > length
    ? text.slice(0, length)
    : " ".repeat(length - text.length) + text;
}

module.exports = { padRight, padLeft };
