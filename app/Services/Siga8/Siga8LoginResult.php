<?php

namespace App\Services\Siga8;

/**
 * DTO hasil login SIGA8 yang sudah divalidasi bentuknya — supaya kode
 * pemanggil tidak bergantung pada struktur array mentah respons HTTP.
 */
final class Siga8LoginResult
{
    /** @param array<int, array{id: string, name: string, level: int}> $roles */
    public function __construct(
        public readonly string $token,
        public readonly string $userId,
        public readonly string $username,
        public readonly ?string $fullName,
        public readonly ?int $level,
        public readonly ?string $facultyCode,
        public readonly ?string $facultyName,
        public readonly ?string $studyProgramsCode,
        public readonly array $roles,
    ) {}

    public static function fromResponseData(array $data): self
    {
        $user = $data['user'] ?? throw new Siga8AuthException(
            'Struktur respons SIGA8 tidak sesuai kontrak (field "user" hilang).',
            'unexpected_response',
        );

        foreach (['user_id', 'username'] as $required) {
            if (empty($user[$required])) {
                throw new Siga8AuthException(
                    "Field wajib '$required' hilang pada respons SIGA8.",
                    'unexpected_response',
                );
            }
        }

        return new self(
            token: $data['token'] ?? throw new Siga8AuthException('Token SIGA8 hilang.', 'unexpected_response'),
            userId: $user['user_id'],
            username: $user['username'],
            fullName: $user['full_name'] ?? null,
            level: isset($user['level']) ? (int) $user['level'] : null,
            facultyCode: $user['faculty_code'] ?? null,
            facultyName: $user['faculty_name'] ?? null,
            studyProgramsCode: $user['study_programs_code'] ?? null,
            roles: $user['roles'] ?? [],
        );
    }
}
