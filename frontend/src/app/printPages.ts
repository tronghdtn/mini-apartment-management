import { lazy } from 'react'

export const InvoicePrintPage = lazy(() => import('@/pages/print/InvoicePrintPage').then(module => ({ default: module.InvoicePrintPage })))
export const ReceiptPrintPage = lazy(() => import('@/pages/print/ReceiptPrintPage').then(module => ({ default: module.ReceiptPrintPage })))
export const AdminContractPrintPage = lazy(() => import('@/pages/print/AdminContractPrintPage').then(module => ({ default: module.AdminContractPrintPage })))
export const ResidentContractPrintPage = lazy(() => import('@/pages/print/ResidentContractPrintPage').then(module => ({ default: module.ResidentContractPrintPage })))
