<?php

namespace Tests\Unit;

use App\Support\HiddenPasswordInput;
use Illuminate\Console\OutputStyle;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

class HiddenPasswordInputTest extends TestCase
{
    public static function endings(): array
    {
        return [['Password Only Test!42', "\n"], ['  Keep Spaces!42  ', "\n"], ['  Keep Spaces!42  ', "\r\n"], ['MậtKhẩuChỉChoTest!42', "\n"], [str_repeat('a', 72), "\n"], ['No Terminator!42', '']];
    }

    #[DataProvider('endings')]
    public function test_real_console_reader_removes_terminal_ending_and_preserves_password(string $password, string $ending): void
    {
        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $password.$ending);
        rewind($stream);
        $input = new ArrayInput([]);
        $input->setInteractive(true);
        $input->setStream($stream);
        $output = new BufferedOutput;
        try {
            $value = HiddenPasswordInput::ask(new OutputStyle($input, $output), 'Mật khẩu');
            $this->assertSame($password, $value);
            $this->assertStringNotContainsString($password, $output->fetch());
        } finally {
            fclose($stream);
        }
    }
}
