import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type MoralisToolName =
  | "mcp_moralis__evm_getblock"
  | "mcp_moralis__evm_getdatetoblock"
  | "mcp_moralis__evm_getdefipositionsbyprotocol"
  | "mcp_moralis__evm_getdefipositionssummary"
  | "mcp_moralis__evm_getdefisummary"
  | "mcp_moralis__evm_getdiscoverytoken"
  | "mcp_moralis__evm_getentitiesbycategory"
  | "mcp_moralis__evm_getentity"
  | "mcp_moralis__evm_getentitycategories"
  | "mcp_moralis__evm_getfilteredtokens"
  | "mcp_moralis__evm_gethistoricaltokenholders"
  | "mcp_moralis__evm_gethottestnftcollectionsbytradingvolume"
  | "mcp_moralis__evm_getlatestblocknumber"
  | "mcp_moralis__evm_getmultiplenfts"
  | "mcp_moralis__evm_getmultipletokenanalytics"
  | "mcp_moralis__evm_getmultipletokenprices"
  | "mcp_moralis__evm_getnativebalancesforaddresses"
  | "mcp_moralis__evm_getnftbulkcontractmetadata"
  | "mcp_moralis__evm_getnftbycontracttraits"
  | "mcp_moralis__evm_getnftcollectionstats"
  | "mcp_moralis__evm_getnftcontractsaleprices"
  | "mcp_moralis__evm_getnftcontracttransfers"
  | "mcp_moralis__evm_getnftfloorpricebycontract"
  | "mcp_moralis__evm_getnfthistoricalfloorpricebycontract"
  | "mcp_moralis__evm_getnftmetadata"
  | "mcp_moralis__evm_getnftsaleprices"
  | "mcp_moralis__evm_getnfttrades"
  | "mcp_moralis__evm_getnfttradesbywallet"
  | "mcp_moralis__evm_getnfttraitsbycollection"
  | "mcp_moralis__evm_getpaircandlesticks"
  | "mcp_moralis__evm_getpairstats"
  | "mcp_moralis__evm_getsnipersbypairaddress"
  | "mcp_moralis__evm_getswapsbypairaddress"
  | "mcp_moralis__evm_getswapsbytokenaddress"
  | "mcp_moralis__evm_getswapsbywalletaddress"
  | "mcp_moralis__evm_gettimeseriestokenanalytics"
  | "mcp_moralis__evm_gettimeseriesvolume"
  | "mcp_moralis__evm_gettimeseriesvolumebycategory"
  | "mcp_moralis__evm_gettokenholders"
  | "mcp_moralis__evm_gettokenmetadata"
  | "mcp_moralis__evm_gettokenowners"
  | "mcp_moralis__evm_gettokenpairs"
  | "mcp_moralis__evm_gettokenscore"
  | "mcp_moralis__evm_gettokentransfers"
  | "mcp_moralis__evm_gettopcryptocurrenciesbymarketcap"
  | "mcp_moralis__evm_gettopcryptocurrenciesbytradingvolume"
  | "mcp_moralis__evm_gettoperc20tokensbymarketcap"
  | "mcp_moralis__evm_gettoperc20tokensbypricemovers"
  | "mcp_moralis__evm_gettopgainerstokens"
  | "mcp_moralis__evm_gettoploserstokens"
  | "mcp_moralis__evm_gettopnftcollectionsbymarketcap"
  | "mcp_moralis__evm_gettopprofitablewalletpertoken"
  | "mcp_moralis__evm_gettransactionverbose"
  | "mcp_moralis__evm_gettrendingtokensv2"
  | "mcp_moralis__evm_getuniqueownersbycollection"
  | "mcp_moralis__evm_getvolumestatsbycategory"
  | "mcp_moralis__evm_getvolumestatsbychain"
  | "mcp_moralis__evm_getwalletactivechains"
  | "mcp_moralis__evm_getwalletapprovals"
  | "mcp_moralis__evm_getwallethistory"
  | "mcp_moralis__evm_getwalletnetworth"
  | "mcp_moralis__evm_getwalletnftcollections"
  | "mcp_moralis__evm_getwalletnfts"
  | "mcp_moralis__evm_getwalletprofitability"
  | "mcp_moralis__evm_getwalletprofitabilitysummary"
  | "mcp_moralis__evm_getwalletstats"
  | "mcp_moralis__evm_getwallettokenbalancesprice"
  | "mcp_moralis__evm_resolveaddress"
  | "mcp_moralis__evm_resolveensdomain"
  | "mcp_moralis__evm_searchentities"
  | "mcp_moralis__evm_searchtokens"
  | "mcp_moralis__solana_balance"
  | "mcp_moralis__solana_getaggregatedtokenpairstats"
  | "mcp_moralis__solana_getbondingtokensbyexchange"
  | "mcp_moralis__solana_getcandlesticks"
  | "mcp_moralis__solana_getgraduatedtokensbyexchange"
  | "mcp_moralis__solana_gethistoricaltokenholders"
  | "mcp_moralis__solana_getmultipletokenprices"
  | "mcp_moralis__solana_getnewtokensbyexchange"
  | "mcp_moralis__solana_getnftmetadata"
  | "mcp_moralis__solana_getnfts"
  | "mcp_moralis__solana_getpairstats"
  | "mcp_moralis__solana_getportfolio"
  | "mcp_moralis__solana_getsnipersbypairaddress"
  | "mcp_moralis__solana_getspl"
  | "mcp_moralis__solana_getswapsbypairaddress"
  | "mcp_moralis__solana_getswapsbytokenaddress"
  | "mcp_moralis__solana_getswapsbywalletaddress"
  | "mcp_moralis__solana_gettokenbondingstatus"
  | "mcp_moralis__solana_gettokenholders"
  | "mcp_moralis__solana_gettokenmetadata"
  | "mcp_moralis__solana_gettokenpairs"
  | "mcp_moralis__solana_gettokenprice"
  | "mcp_moralis__solana_gettopholders";

export type MoralisClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_MORALIS_MCP_URL ?? "https://moralis.nex-t1.ai/mcp";

export class MoralisMcpClient extends HttpMcpClient<MoralisToolName> {
  constructor(options: MoralisClientOptions = {}) {
    super({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      // Moralis MCP might not need an API key if it's internal/proxied, or it might use one.
      // Assuming it uses the same pattern as Helius if needed, or just relies on internal net.
      apiKey: options.apiKey, 
      requestTimeoutMs: options.requestTimeoutMs,
      maxRetries: options.maxRetries,
      defaultHeaders: options.defaultHeaders,
      name: "Moralis MCP",
    });
  }

  async invoke(
    tool: MoralisToolName,
    args: Record<string, UntypedJson> = {}
  ): Promise<McpToolInvocationResult<MoralisToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: MoralisToolName,
    args: Record<string, UntypedJson> = {}
  ): Promise<McpToolInvocationResult<MoralisToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultMoralisClient = new MoralisMcpClient();
