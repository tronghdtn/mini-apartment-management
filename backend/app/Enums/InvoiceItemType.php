<?php

namespace App\Enums;

/** Loại dòng hóa đơn — invoice_items.item_type. Chỉ `discount` được có amount âm trong MVP. */
enum InvoiceItemType: string
{
    case Rent = 'rent';
    case Electricity = 'electricity';
    case Water = 'water';
    case Service = 'service';
    case Discount = 'discount';
    case Other = 'other';
    case TerminationFee = 'termination_fee';
    case Damage = 'damage';
}
