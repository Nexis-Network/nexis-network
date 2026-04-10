// Domain: wallets (Safe)
// Responsibility: Build Safe-compatible contract signatures from WebAuthn assertions (passkey owners).
// Depends on: viem, @safe-global/protocol-kit
// Notes:
// - Never log raw assertion payloads.
// - The Safe passkey signer expects ABI-encoded: (bytes authenticatorData, bytes clientDataFields, uint256[2] sig).

import { encodeAbiParameters, parseAbiParameters, stringToHex, type Address, type Hex } from "viem";
import { EthSafeSignature, buildSignatureBytes } from "@safe-global/protocol-kit";

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  // Ensure we return a Uint8Array backed by an ArrayBuffer (not SharedArrayBuffer).
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function decodeClientDataJSON(clientDataJSON: Uint8Array): string {
  return Buffer.from(clientDataJSON).toString("utf8");
}

function extractClientDataFieldsHex(clientDataJSON: Uint8Array): Hex {
  const decoded = decodeClientDataJSON(clientDataJSON);
  const match = decoded.match(/^\{"type":"webauthn\\.get","challenge":"[A-Za-z0-9\\-_]{43}",(.*)\}$/u);
  if (!match) {
    throw new Error("challenge_not_found_in_client_data_json");
  }
  const [, fields] = match;
  return stringToHex(fields);
}

function parseDerSignatureToRS(signatureDer: Uint8Array): readonly [bigint, bigint] {
  const check = (condition: boolean) => {
    if (!condition) throw new Error("invalid_signature_encoding");
  };

  // Minimal DER parser for `0x30 len 0x02 lenR r 0x02 lenS s` (P-256 ECDSA).
  const view = new DataView(signatureDer.buffer.slice(signatureDer.byteOffset, signatureDer.byteOffset + signatureDer.byteLength));
  check(view.byteLength >= 8);
  check(view.getUint8(0) === 0x30);
  check(view.getUint8(1) === view.byteLength - 2);

  const readInt = (offset: number): readonly [bigint, number] => {
    check(view.getUint8(offset) === 0x02);
    const len = view.getUint8(offset + 1);
    const start = offset + 2;
    const end = start + len;
    check(end <= view.byteLength);
    const bytes = new Uint8Array(view.buffer.slice(start, end));
    const hex = Buffer.from(bytes).toString("hex") || "00";
    return [BigInt(`0x${hex}`), end];
  };

  const [r, next] = readInt(2);
  const [s] = readInt(next);
  return [r, s] as const;
}

export type PasskeyAssertionJSON = {
  id: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
  };
};

export function buildPasskeySignatureBytesFromAssertion(params: {
  assertion: PasskeyAssertionJSON;
}): Hex {
  const authData = fromBase64Url(params.assertion.response.authenticatorData);
  const clientData = fromBase64Url(params.assertion.response.clientDataJSON);
  const signatureDer = fromBase64Url(params.assertion.response.signature);

  const clientDataFieldsHex = extractClientDataFieldsHex(clientData);
  const [r, s] = parseDerSignatureToRS(signatureDer);

  return encodeAbiParameters(parseAbiParameters("bytes, bytes, uint256[2]"), [
    `0x${Buffer.from(authData).toString("hex")}` as Hex,
    clientDataFieldsHex,
    [r, s],
  ]);
}

export function wrapPasskeySignatureAsSafeContractSignature(params: {
  signerAddress: Address;
  passkeySignature: Hex;
}): Hex {
  const signature = new EthSafeSignature(params.signerAddress, params.passkeySignature, true);
  return buildSignatureBytes([signature]) as Hex;
}
