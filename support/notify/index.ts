import api from "@flatfile/api";

export async function notify(msg: string, state: string, spaceId: string) {
  const url = process.env.WEBHOOK_SITE_URL;
  const space = await api.spaces.get(spaceId);
  const users = await api.users.list();
  const userEmailsAsArray = users.data.map((user) => user.email);
  const body = {
    msg: msg,
    state: state,
    spaceId: spaceId,
    spaceName: space.data.name,
    userEmailsToNotify: userEmailsAsArray,
  };

  if (!url) {
    console.error("WEBHOOK_SITE_URL is not defined");
    return;
  }

  fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
