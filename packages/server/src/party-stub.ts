import type { PartyClass } from "./server.js";
import type { RoomStorage } from "./storage.js";
import { MemoryStorage } from "./storage.js";

export interface PartyFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/**
 * In-process stub used by the Node runtime for multi-party composition.
 * Mirrors PartyServer's `env.OtherParty.getByName(id).fetch(...)` shape.
 */
export class InProcessPartyStub implements PartyFetcher {
  constructor(
    private readonly Party: PartyClass,
    private readonly roomId: string,
    private readonly getOrCreate: (
      roomId: string,
      Party: PartyClass,
    ) => { server: InstanceType<PartyClass>; storage: RoomStorage },
  ) {}

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request =
      input instanceof Request ? input : new Request(input, init);
    const handle = this.getOrCreate(this.roomId, this.Party);
    return handle.server.handleHttp(request);
  }
}

export function createMemoryPartyNamespace(Party: PartyClass) {
  const rooms = new Map<
    string,
    { server: InstanceType<PartyClass>; storage: RoomStorage }
  >();

  const getOrCreate = (roomId: string, Klass: PartyClass) => {
    const existing = rooms.get(roomId);
    if (existing) return existing;
    const storage = new MemoryStorage();
    const server = new Klass(roomId, storage);
    const handle = { server, storage };
    rooms.set(roomId, handle);
    return handle;
  };

  return {
    getByName(name: string) {
      return new InProcessPartyStub(Party, name, getOrCreate);
    },
    idFromName(name: string) {
      return { toString: () => name, name };
    },
    get(id: { toString(): string; name?: string }) {
      const name = id.name ?? id.toString();
      return new InProcessPartyStub(Party, name, getOrCreate);
    },
  };
}