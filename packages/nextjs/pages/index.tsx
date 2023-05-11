import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowDownTrayIcon, HomeIcon, PaperAirplaneIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { Balance, FaucetButton } from "~~/components/scaffold-eth";
import { AddressMain } from "~~/components/scaffold-eth/AddressMain";
import { TokenBalance } from "~~/components/scaffold-eth/TokenBalance";
import { Collectibles, Main, Receive, Send } from "~~/components/screens";
import { Mint } from "~~/components/screens/Mint";
import { NotAllowed } from "~~/components/screens/NotAllowed";
import { isBurnerWalletloaded, useAutoConnect, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { useAppStore } from "~~/services/store/store";
import { redirectToScreenFromCode } from "~~/utils/redirectToScreenFromCode";

const screens = {
  main: <Main />,
  send: <Send />,
  receive: <Receive />,
  collectibles: <Collectibles />,
  mint: <Mint />,
};

const Home: NextPage = () => {
  useAutoConnect();

  const router = useRouter();
  const [isLoadingBurnerWallet, setIsLoadingBurnerWallet] = useState(true);

  const screen = useAppStore(state => state.screen);
  const setScreen = useAppStore(state => state.setScreen);

  const { address, isConnected } = useAccount();
  const { data: balance } = useScaffoldContractRead({
    contractName: "EventGems",
    functionName: "balanceOf",
    args: [address],
  });

  const screenRender = screens[screen];
  const isBurnerWalletSet = isBurnerWalletloaded();

  useEffect(() => {
    if (router.asPath === "/") return;
    const code = router.asPath.replace("/#", "");

    // Remove hash from url
    if (typeof window != "undefined" && window != null) {
      const urlWithoutHash = window.location.href.split("#")[0];
      window.history.pushState({}, "", urlWithoutHash);
    }

    redirectToScreenFromCode(code, setScreen, router);
  }, [router]);

  useEffect(() => {
    // Check if isBurnerWalletSet is true OR false
    if (isBurnerWalletSet || isBurnerWalletSet === false) {
      setIsLoadingBurnerWallet(false);
    }
  }, [isBurnerWalletSet]);

  if (!isBurnerWalletSet && !isLoadingBurnerWallet) {
    return <NotAllowed />;
  }

  return (
    <>
      <Head>
        <title>Event wallet</title>
        <meta name="description" content="Created with 🏗 scaffold-eth" />
      </Head>

      <div className="flex flex-col items-center justify-center py-2">
        <div className="max-w-96 p-8">
          <img
            src="https://ueth.org/_nuxt/img/logo.7b7e59b.png"
            alt="EDCON WALLET"
            className="max-w-[40px] absolute top-0 left-0 m-5"
          />
          <div className="absolute top-0 right-0 m-5">
            <div className="flex items-center">
              <Balance address={address} />
              <FaucetButton />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {!isConnected && isLoadingBurnerWallet ? (
              <div className="flex flex-col items-center justify-center my-16">
                <span className="animate-bounce text-8xl">{scaffoldConfig.tokenEmoji}</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center mb-6 gap-4">
                  <AddressMain address={address} />
                  <TokenBalance amount={balance} />
                </div>
                <div className="flex gap-6 justify-center mb-8">
                  <button
                    className={`${screen === "main" ? "bg-primary" : "bg-secondary"} text-white rounded-full p-3`}
                    onClick={() => setScreen("main")}
                  >
                    <HomeIcon className="w-8" />
                  </button>
                  <button
                    className={`${screen === "receive" ? "bg-primary" : "bg-secondary"} text-white rounded-full p-3`}
                    onClick={() => setScreen("receive")}
                  >
                    <ArrowDownTrayIcon className="w-8" />
                  </button>
                  <button
                    className={`${screen === "send" ? "bg-primary" : "bg-secondary"} text-white rounded-full p-3`}
                    onClick={() => setScreen("send")}
                  >
                    <PaperAirplaneIcon className="w-8" />
                  </button>
                  <button
                    className={`${
                      screen === "collectibles" ? "bg-primary" : "bg-secondary"
                    } text-white rounded-full p-3`}
                    onClick={() => setScreen("collectibles")}
                  >
                    <PhotoIcon className="w-8" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div>{screenRender}</div>
        </div>
      </div>
    </>
  );
};

export default Home;
