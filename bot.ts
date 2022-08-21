var path = require("path");

const ethers = require("ethers");
const json = require("./config.json");

const addresses = {
  WBNB: json.data.WBNB,
  factory: json.data.factory,
  router: json.data.router,
  recipient: json.data.recipient,
};

/* 助记词配置 */
const mnemonic = "";

/* 构建provider */
const provider = new ethers.providers.WebSocketProvider(
  "https://bsc-dataseed.binance.org",
);

/* 构建钱包，链接账户 */
const randomWallet = ethers.Wallet.createRandom(); // 随机钱包
const _mnemonic = randomWallet._mnemonic().phrase; // 随机钱包的助记词

const wallet = ethers.Wallet.fromMnemonic(_mnemonic);

const account = wallet.connect(provider);

/* 拿到工厂合约 */
const factory = new ethers.Contract(
  addresses.factory,
  [
    "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
  ],
  account,
);

/* 拿到路由合约 */
const router = new ethers.Contract(
  addresses.router,
  [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  ],
  account,
);

/* 拿到BNB合约-后续交易用 */
const wbnb = new ethers.Contract(
  addresses.WBNB,
  ["function approve(address spender) public returns(bool)"],
  account,
);

/* 初始化，先进行token授权操作 */
const init = async () => {
  const tx = await wbnb.approve(router.address, ethers.constants.MaxUint256);
  const receipt = await tx.wait();
  console.log("Transaction receipt");
  console.log(receipt);
};

/*
 * 监听工厂合约中的 PairCreated 事件
 *
 * token0 通常是流通币
 * token1 通常是新发币
 * pairAddress 通常是LP的地址
 */
factory.on("PairCreated", async (token0, token1, pairAddress) => {
  console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}
  `);

  let tokenIn, tokenOut;
  if (token0 === addresses.WBNB) {
    tokenIn = token0;
    tokenOut = token1;
  }

  if (token1 == addresses.WBNB) {
    tokenIn = token1;
    tokenOut = token0;
  }

  if (typeof tokenIn === "undefined") {
    return;
  }

  /* 交易部分 */
  /*   const amountIn = ethers.utils.parseUnits("0.001", "ether");
  const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
  const amountOutMin = amounts[1].sub(amounts[1].div(10));
  console.log(`
    Buying new token
    =================
    tokenIn: ${amountIn.toString()} ${tokenIn} (WBNB)
    tokenOut: ${amounOutMin.toString()} ${tokenOut}
  `);
  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    [tokenIn, tokenOut],
    addresses.recipient,
    Date.now() + 1000 * 60 * 10, // 10 minutes
    {
      gasPrice: 5000000000,
      gasLimit: 1000000,
    },
  );
  const receipt = await tx.wait();
  console.log("Transaction receipt");
  console.log(receipt); */
});

init().catch(err => {
  console.log(err);
});
