<?php

namespace Tests\Support;

use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Testing\TestResponse;

/** Client cookie qua HTTP kernel, không dùng actingAs/withSession hay token giả. */
trait InteractsWithSpaCookies
{
    protected array $cookieJar = [];

    protected function initializeSpaClient(): void
    {
        config([
            'session.driver' => 'database',
            'session.connection' => 'mysql_test',
            'session.lottery' => [0, 100],
            'sanctum.stateful' => ['localhost:8080'],
        ]);

        // Laravel mặc định bỏ CSRF khi unit testing. Test này bắt buộc kiểm tra thật,
        // chỉ thay runningUnitTests(), không đổi môi trường/guard DB-D30.
        $factory = fn ($app) => new class($app, $app['encrypter']) extends ValidateCsrfToken
        {
            protected function runningUnitTests()
            {
                return false;
            }
        };
        $this->app->bind(ValidateCsrfToken::class, $factory);
        $this->app->bind(PreventRequestForgery::class, $factory);
        $this->spa('GET', '/sanctum/csrf-cookie')->assertNoContent();
    }

    protected function spa(string $method, string $uri, array $data = [], array $server = [], bool $sendCsrf = true): TestResponse
    {
        // Mỗi request nạp lại guard và session từ cookie + MySQL, tránh giữ user trong RAM.
        $this->app['auth']->forgetGuards();
        $this->app['auth']->setDefaultDriver('web');
        $this->app->forgetInstance('auth.driver');
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');

        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_ORIGIN' => 'http://localhost:8080',
            'HTTP_REFERER' => 'http://localhost:8080/',
        ];
        if ($sendCsrf && isset($this->cookieJar['XSRF-TOKEN'])) {
            $headers['HTTP_X_XSRF_TOKEN'] = $this->cookieJar['XSRF-TOKEN'];
        }

        $response = $this->call($method, $uri, [], $this->cookieJar, [], array_replace($headers, $server), json_encode($data));
        foreach ($response->headers->getCookies() as $cookie) {
            $this->cookieJar[$cookie->getName()] = $cookie->getValue();
        }

        return $response;
    }

    protected function sessionId(): string
    {
        $value = $this->app['encrypter']->decrypt($this->cookieJar[config('session.cookie')], false);

        return CookieValuePrefix::remove($value);
    }
}
