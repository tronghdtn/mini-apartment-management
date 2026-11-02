export type ContractDueState = 'expiring' | 'overdue' | null

export interface ResidentOverviewContract {
  id: number
  contract_number: string | null
  start_date: string
  end_date: string
  planned_handover_date: string
  due_state: ContractDueState
  expiring_warning_days: number
  room: { code: string; building_name: string; address: string }
}

export interface ResidentOverview {
  today: string
  active_contract: ResidentOverviewContract | null
  debt: {
    outstanding_amount: string
    outstanding_invoice_count: number
    overdue_amount: string
    overdue_invoice_count: number
  }
}
