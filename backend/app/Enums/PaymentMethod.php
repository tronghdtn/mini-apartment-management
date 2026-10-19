<?php

namespace App\Enums;

/** Hình thức thanh toán — payments.method. `deposit` do hệ thống tạo khi đối soát cọc, không là doanh thu thực thu. */
enum PaymentMethod: string
{
    case Cash = 'cash';
    case BankTransfer = 'bank_transfer';
    case Deposit = 'deposit';
}
