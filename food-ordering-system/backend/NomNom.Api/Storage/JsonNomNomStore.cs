using System.Text.Json;
using NomNom.Api.Models;

namespace NomNom.Api.Storage;

internal sealed class JsonNomNomStore(string path) : INomNomStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly SemaphoreSlim gate = new(1);

    public async Task<NomNomData> ReadAsync(CancellationToken cancellationToken)
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await LoadAsync(cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<bool> UpdateAsync(Func<NomNomData, bool> update, CancellationToken cancellationToken)
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            var data = await LoadAsync(cancellationToken);
            if (!update(data)) return false;
            await SaveAsync(data, cancellationToken);
            return true;
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<NomNomData> LoadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
        {
            var empty = new NomNomData();
            await SaveAsync(empty, cancellationToken);
            return empty;
        }

        await using var file = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<NomNomData>(file, JsonOptions, cancellationToken)
            ?? throw new JsonException("The database must contain a JSON object.");
    }

    private async Task SaveAsync(NomNomData data, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporaryPath = $"{path}.{Guid.NewGuid():N}.tmp";
        try
        {
            await using (var file = File.Create(temporaryPath))
            {
                await JsonSerializer.SerializeAsync(file, data, JsonOptions, cancellationToken);
                await file.FlushAsync(cancellationToken);
                file.Flush(flushToDisk: true);
            }

            cancellationToken.ThrowIfCancellationRequested();
            File.Move(temporaryPath, path, overwrite: true);
        }
        finally
        {
            File.Delete(temporaryPath);
        }
    }
}
