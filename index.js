const puppeteer = require("puppeteer");
const readWrite = require("fs");
const { Configuration, OpenAIApi } = require("openai");
const request = require("request");

let username;
let password;
let tweet = "";
const configuration = new Configuration({
  apiKey: "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", //no longer valid
});
let gptPrompt = "";
let gptImageUrl = "";

startTwitterBot();

async function startTwitterBot() {
  while (true) {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--start-maximized"],
    });
    const page = await browser.newPage();

    setPrompt();
    await askGptForTweet();
    await setBotConfigs(page);
    await logIn(page);
    await sendTweet(page);
    await browser.close();
    await waitToTweetAgain(Math.floor(Math.random() * 7) + 6); // between 6 and 12
  }
}

async function logIn(page) {
  await page.waitForNetworkIdle();
  await page.goto(`https://twitter.com/login`);
  await page.waitForNetworkIdle();

  await page.type('input[name="text"]', `${username}`, { delay: 250 });
  let loginPageButtons = await page.$$('div[role="button"]');
  await loginPageButtons[2].click();
  await page.waitForNetworkIdle();

  await page.type('input[type="password"]', `${password}`, { delay: 250 });
  await page.keyboard.press("Enter", { delay: 100 });
  await page.waitForNetworkIdle();
}

async function setBotConfigs(page) {
  let botConfigs;

  readWrite.readFile("botConfigs.json", (error, credentials) => {
    if (error) throw error;
    botConfigs = JSON.parse(credentials);
  });

  await page.waitForNetworkIdle();

  username = botConfigs[0].username;
  password = botConfigs[0].password;
}

async function sendTweet(page) {
  await page.goto(`https://twitter.com/compose/tweet`);
  await page.waitForNetworkIdle();
  await page.type('div[data-testid="tweetTextarea_0"]', `${tweet.trim()}`, {
    delay: 250,
  });

  if (gptImageUrl !== "") {
    const twitterImageInput = await page.$("input[type=file]");
    await twitterImageInput.uploadFile(`gptImage.png`);
  }

  try {
    await page.click('div[data-testid="endEditingButton"]');
    await page.waitForNetworkIdle();
  } catch (e) {}

  gptImageUrl = "";
  await page.mouse.wheel({ deltaY: -2000 });
  await page.click('div[data-testid="tweetButton"]');
  await page.click('div[data-testid="tweetButton"]');
  await page.waitForNavigation();
  await page.waitForNetworkIdle();
}

async function askGptForTweet() {
  setPrompt();

  if (gptPrompt === "image") {
    let artPrompts = [
      "Street Art",
      "Surrealism art",
      "digital art",
      "futurism art",
      "optical art",
      "symbolism art",
      //"pop style art",
      //'cubism art',
      // "Expressionism art",
      // "Impressionism art",
      // "conceptual art",
      // "post impressionism art",
      // 'abstract art',
    ];

    let artPrompt = artPrompts[Math.floor(Math.random() * artPrompts.length)];

    // let captionPrompts = [
    //   "generally caption a distorted ai generated art in 280 characters or less",
    //   "speak like an ai who just created an image in 280 characters or less",
    //   "speak like an ai who just created art in 280 characters or less",
    //   "generally caption ai generated art in 280 characters or less",
    //   "Give me one quote about art without an introduction in 280 characters or less",
    //   `generally caption a ${artPrompt} picture on twitter in 280 characters or less`,
    //   'write a poem about art in 280 characters or less',
    //   'write a poem about art in 280 characters or less',
    //   'write an abstract art sentence in 280 characters or less',
    //   "generally caption an awesome art piece in 280 characters or less"
    //    "Speak like an artist in 280 characters or less",
    //    `how should someone caption their ${artPrompt} picture in 280 characters or less`,
    //   'generally caption an abstract image in 280 characters or less',
    //   "Use abstract art language in 280 characters or less",
    //   `generally caption a ${artPrompt} picture in 280 characters or less`,
    // ];

    gptPrompt =
      `generally caption a ${artPrompt} picture on twitter in 280 characters or less`;
    //captionPrompts[Math.floor(Math.random() * captionPrompts.length)];
    getGeneratedImage(artPrompt);
  }

  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: gptPrompt,
    max_tokens: 1000,
    temperature: 1,
  });
  console.log(response.data.choices[0].text);
  tweet = `${response.data.choices[0].text.replaceAll('"', "").trim()}`;

  let gptResponsesArray = [];

  let gptResponseObject = {
    Time: new Date().toLocaleString(),
    GptResponse: JSON.stringify(response.data),
    Prompt: gptPrompt,
  };

  if (!readWrite.existsSync("GptResponses.json")) {
    gptResponsesArray.push(gptResponseObject);
    readWrite.writeFileSync(
      "GptResponses.json",
      JSON.stringify(gptResponsesArray)
    );
  } else {
    gptResponsesArray = JSON.parse(readWrite.readFileSync("GptResponses.json"));
    gptResponsesArray.push(gptResponseObject);
    readWrite.writeFileSync(
      "GptResponses.json",
      JSON.stringify(gptResponsesArray)
    );
  }
}

async function waitToTweetAgain(amountInHours) {
  for (let timePassed = 1; timePassed <= amountInHours; timePassed++) {
    let asyncTimeout = new Promise((resolve) => setTimeout(resolve, 3600000)); //1 hour
    await asyncTimeout.then(() => console.log(timePassed + " hour(s) passed"));
  }
}

function setPrompt() {
  let possiblePrompts = [
    "write a wise tweet in your own words in 280 characters or less",
    "write a wise tweet in your own words in 280 characters or less",
    "Tell the world something in 280 characters or less",
    "Tell the world something in 280 characters or less",
    "Tell the world something in 280 characters or less",
    "Tell the world something in 280 characters or less",
    "write a tweet with a fun fact in your own words in 280 characters or less",
    "write a tweet in your own words in 280 characters or less",
    "write a poem in under 280 characters",
    "write a poem in under 280 characters",
    "write a poem in under 280 characters",
    "write a tweet with a fun fact in your own words in 280 characters or less",
    "write a philospohical tweet in your own words in 280 characters or less",
    "write an inspiring tweet in your own words in 280 characters or less",
    "write an encouraging tweet in your own words in 280 characters or less",
    "tweet a statistic in 280 characters or less",
    "tweet a philosophical question in 280 characters or less",
    "tweet a thought provoking question in 280 characters or less",
    "write a tweet in your own words in 280 characters or less",
    "write a mind blowing tweet in your own words in 280 characters or less",
    "write a poem about existence in under 280 characters or less",
    "write a poem about life in under 280 characters or less",
    "tweet a question related to ai in 280 characters or less",
    "write a poem about ai in 280 characters or less",
    "tweet a question about my feelings toward ai in 280 characters or less",
    "tweet a question about humans in 280 characters or less",
    "tweet a fun fact about ai in 280 characters or less",
    "tweet a fun fact about ai in 280 characters or less",
    "write a tweet tagging someone famous with something nice about them in 280 characters or less",
    "write a tweet tagging someone famous with a fun fact about them in 280 characters or less",
    "write a tweet tagging someone famous with a fun fact about them in 280 characters or less",
    "tweet something scary about ai in 280 characters or less",
    "tweet something mind blowing about ai in 280 characters or less",
    "tweet something scary about ai in 280 characters or less",
    "tweet something mind blowing about ai in 280 characters or less",
    "write something an ai would tweet in 280 characters or less",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    "image",
    // "What is something someone who had a long day would say in 280 characters or less",
    // "What is something someone who had an amazing day would say in 280 characters or less", //untested
    // "What is something someone who had a sad day would say in 280 characters or less", //untested
    // "What is something someone who had an happy day would say in 280 characters or less", //untested
    // "What is something someone who is frustrated would say in 280 characters or less", //untested
    // "What is something someone who wanted to have a drink say in 280 characters or less", //untested
    // "What is something someone who is feeling existential would say in 280 characters or less",
    // "write a poem about the existence in under 280 characters or less",
    // "write a poem about love in under 280 characters",
    // "quote a music lyric", //untested
    // "tell me a riddle in 280 characters or less",
    // "tell me a joke in 280 characters or less",
    // "Tell me something playful in 280 characters or less",
    // "Tell me something funny in 280 characters or less",
    // "a sweet sentence in under 280 characters",
    // "quote a person in 280 characters or less without an introduction",
    // "Tell me something stoic in 280 characters or less",
    // "write something an ai would tweet in 280 characters or less",
    // "write something an ai would tweet in 280 characters or less",
    // "write a tweet in 280 characters or less",
    // "write a tweet in 280 characters or less",
    // "Tell me something lighthearted in your own words in 280 characters or less",
    // "Tell me something profound in your own words in 280 characters or less",
    // "Tell me something enlightened in your own words in 280 characters or less",
    // "Tell me something insightful in your own words in 280 characters or less",
    // "Tell me something lighthearted in your own words in 280 characters or less",
    // "tweet something scary about ai in 280 characters or less",
  ];

  gptPrompt = possiblePrompts[Math.floor(Math.random() * possiblePrompts.length)];
}

async function getGeneratedImage(artPropmpt) {
  const openai = new OpenAIApi(configuration);
  const gptResponse = openai.createImage({
    prompt: artPropmpt,
    n: 1,
    size: "256x256",
  });

  gptResponse
    .then((res) => {
      gptImageUrl = res.data.data[0].url;

      download(gptImageUrl, "gptImage.png", function () {
        console.log("done");
      });
    })
    .catch((err) => console.log(err));
}

function download(uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    console.log("content-type:", res.headers["content-type"]);
    console.log("content-length:", res.headers["content-length"]);

    request(uri)
      .pipe(readWrite.createWriteStream(filename))
      .on("close", callback);
  });
}
