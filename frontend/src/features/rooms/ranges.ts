export const roomPriceRanges = [
  ['Dưới 3,5 triệu', '', '3499999'],
  ['3,5–4,5 triệu', '3500000', '4500000'],
  ['Trên 4,5 đến 6 triệu', '4500001', '6000000'],
  ['Trên 6 triệu', '6000001', ''],
] as const

export const roomAreaRanges = [
  ['Dưới 25 m²', '', '24.99'],
  ['25–35 m²', '25', '35'],
  ['Trên 35 đến 45 m²', '35.01', '45'],
  ['Trên 45 m²', '45.01', ''],
] as const

export const roomOccupantRanges = [
  ['1 người', '1', '1'],
  ['2 người', '2', '2'],
  ['3 người', '3', '3'],
  ['Từ 4 người', '4', ''],
] as const
