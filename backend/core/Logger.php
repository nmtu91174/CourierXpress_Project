<?php
class Logger
{
    public static function app(string $message)
    {
        $file = __DIR__ . "/../logs/app.log";
        file_put_contents(
            $file,
            "[" . date("Y-m-d H:i:s") . "] ERROR | {$message}\n",
            FILE_APPEND
        );
    }

    public static function audit(string $message)
    {
        $file = __DIR__ . "/../logs/audit.log";
        file_put_contents(
            $file,
            "[" . date("Y-m-d H:i:s") . "] {$message}\n",
            FILE_APPEND
        );
    }
}
