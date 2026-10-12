import { YjsServer } from "@sinkd/y";

/** Collaborative document party — y-websocket binary protocol. */
export class Docs extends YjsServer {
  static override options = { hibernate: true };
}

export default Docs;