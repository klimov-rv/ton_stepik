import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from 'ton-core'; // Стоит обновиться до '@ton/core', а не 'ton-core'

export type GoGoTonConfig = {
  counter: number;
  recentSender: Address;
  owner: Address;
};

export function GoGoTonConfigToCell(config: GoGoTonConfig): Cell {
  return beginCell()
    .storeUint(config.counter, 32)
    .storeAddress(config.recentSender)
    .storeAddress(config.owner)
    .endCell();
}

export class MainContract implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromConfig(config: GoGoTonConfig, code: Cell, workchain = 0) {
    const data = GoGoTonConfigToCell(config);
    const init = { code, data };
    const address = contractAddress(workchain, init);

    return new MainContract(address, init);
  }

  // отправляет внутреннее сообщение
  async sendIncrement(
    provider: ContractProvider,
    sender: Sender,
    value: bigint,
    increment_by: number,
  ) {
    const msg_body = beginCell()
      .storeUint(1, 32) // OP code
      .storeUint(increment_by, 32) // increment_by value
      .endCell();

    await provider.internal(sender, {
      value, // сумма TON в формате nano
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: msg_body,
    });
  }

  // геттер который возвращает адрес из c4 хранилища
  async getData(provider: ContractProvider) {
    const { stack } = await provider.get('get_contract_storage_data', []);
    return {
      number: stack.readNumber(),
      recent_sender: stack.readAddress(),
      owner_address: stack.readAddress(),
    };
  }

  // new геттер баланса
  async getBalance(provider: ContractProvider): Promise<bigint> {
    const { stack } = await provider.get('get_contract_balance', []);
    return stack.readBigNumber(); // Используем readBigNumber для баланса
  }

  async sendDeposit(provider: ContractProvider, sender: Sender, value: bigint) {
    const msg_body = beginCell()
      .storeUint(2, 32) // 2 is OP code
      .endCell();

    await provider.internal(sender, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: msg_body,
    });
  }

  // обертка для проверки ситуации когда нет op_code
  async sendNoCodeDeposit(
    provider: ContractProvider,
    sender: Sender,
    value: bigint,
  ) {
    const msg_body = beginCell().endCell();

    await provider.internal(sender, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: msg_body,
    });
  }

  async sendWithdrawalRequest(
    provider: ContractProvider,
    sender: Sender,
    value: bigint,
    amount: bigint,
  ) {
    const msg_body = beginCell()
      .storeUint(3, 32) // OP code
      .storeCoins(amount)
      .endCell();

    await provider.internal(sender, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: msg_body,
    });
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  // Дополнительные геттеры для полной информации
  async getFullContractInfo(provider: ContractProvider) {
    const { stack } = await provider.get('get_full_contract_info', []);
    return {
      balance: stack.readBigNumber(),
      number: stack.readNumber(),
      recent_sender: stack.readAddress(),
      owner_address: stack.readAddress(),
    };
  }
}
