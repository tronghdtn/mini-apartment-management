<?php

namespace App\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResidentOverviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $active = $this->resource['active_contract'];
        $contract = $active['contract'] ?? null;

        return [
            'today' => $this->resource['today'],
            'active_contract' => $contract === null ? null : [
                'id' => $contract->id,
                'contract_number' => $contract->contract_number,
                'start_date' => $contract->start_date->format('Y-m-d'),
                'end_date' => $contract->end_date->format('Y-m-d'),
                'planned_handover_date' => CarbonImmutable::parse($contract->end_date->format('Y-m-d'))->addDay()->format('Y-m-d'),
                'due_state' => $active['due_state'],
                'expiring_warning_days' => $active['expiring_warning_days'],
                'room' => ['code' => $contract->room->code, 'building_name' => $contract->room->building->name,
                    'address' => $contract->room->building->address],
            ],
            'debt' => $this->resource['debt'],
        ];
    }
}
