<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ViewingAppointment\AppointmentRequest;
use App\Http\Resources\ViewingAppointmentResource;
use App\Services\ViewingAppointmentService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ViewingAppointmentController extends Controller
{
    public function __construct(private readonly ViewingAppointmentService $appointments) {}

    public function index(AppointmentRequest $request): AnonymousResourceCollection
    {
        return ViewingAppointmentResource::collection($this->appointments->query($request->user(), $request->validated())
            ->orderBy('preferred_at')->orderBy('id')->paginate(20)->withQueryString());
    }

    public function show(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        $item = $this->appointments->query($request->user(), [])->findOrFail($appointment);
        Gate::authorize('view', $item);

        return new ViewingAppointmentResource($item);
    }

    public function store(AppointmentRequest $request): ViewingAppointmentResource
    {
        return new ViewingAppointmentResource($this->appointments->store($request->validated(), $request->user(), $request->server('REMOTE_ADDR', 'unknown')));
    }

    public function confirm(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return $this->change($request, $appointment);
    }

    public function cancel(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return $this->change($request, $appointment);
    }

    public function reschedule(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return $this->change($request, $appointment);
    }

    public function complete(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return $this->change($request, $appointment);
    }

    public function checkIn(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return $this->change($request, $appointment);
    }

    public function checkOut(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return $this->change($request, $appointment);
    }

    private function change(AppointmentRequest $request, int $appointment): ViewingAppointmentResource
    {
        return new ViewingAppointmentResource($this->appointments->change($appointment, $request->user(), $request->route()->getActionMethod(), $request->validated()));
    }
}
