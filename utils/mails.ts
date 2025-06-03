const emailRegex = new RegExp(
  /([a-zA-Z0-9+._-]{1,50}@[a-zA-Z0-9.-]{2,50}\.[a-zA-Z]{2,10})/gm,
);

export const parseEmails = (text: string) => {
  const matches = text.match(emailRegex);
  return matches as string[] | null;
};
