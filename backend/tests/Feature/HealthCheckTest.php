<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_endpoint_reports_ok_when_database_is_reachable(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.database.status', 'ok')
            ->assertJsonStructure([
                'data' => ['status', 'app', 'environment', 'database' => ['status', 'driver', 'error'], 'timestamp'],
            ]);
    }

    public function test_health_endpoint_returns_503_when_database_is_unreachable(): void
    {
        DB::shouldReceive('connection->select')->andThrow(new \RuntimeException('connection refused'));

        $this->getJson('/api/v1/health')
            ->assertStatus(503)
            ->assertJsonPath('data.status', 'degraded')
            ->assertJsonPath('data.database.status', 'degraded');
    }

    public function test_unknown_api_route_returns_json_404(): void
    {
        $this->get('/api/v1/khong-ton-tai')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json');
    }
}
