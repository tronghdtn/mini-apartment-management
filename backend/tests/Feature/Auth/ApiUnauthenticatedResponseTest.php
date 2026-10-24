<?php

namespace Tests\Feature\Auth;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ApiUnauthenticatedResponseTest extends TestCase
{
    public static function requests(): array
    {
        $cases = [];
        foreach (['application/json', 'text/html', '*/*', ''] as $accept) {
            foreach ([['GET', 'auth/me'], ['GET', 'contracts'], ['GET', 'contracts/1'], ['PUT', 'contracts/1/services'], ['GET', 'users']] as [$method, $path]) {
                $cases[$method.' '.$path.' accept='.$accept] = [$method, $path, $accept];
            }
        }

        return $cases;
    }

    #[DataProvider('requests')]
    public function test_api_without_spa_headers_always_returns_json_401_instead_of_resolving_a_named_login_route(string $method, string $path, string $accept): void
    {
        // Không cookie/Origin/Referer; giống mở URL API trực tiếp hoặc một HTTP client chưa login.
        $this->call($method, '/api/v1/'.$path, [], [], [], ['HTTP_ACCEPT' => $accept])
            ->assertUnauthorized()->assertHeader('Content-Type', 'application/json')
            ->assertHeaderMissing('Location')->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }
}
