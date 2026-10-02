// Pocket movements: a pocket only exchanges money with the current account of the bank account
export const PocketTransferKind = Object.freeze({
  CONTRIBUTION: 'contribution', // current account -> pocket ("Aporte")
  WITHDRAWAL: 'withdrawal' // pocket -> current account ("Retirada")
});
