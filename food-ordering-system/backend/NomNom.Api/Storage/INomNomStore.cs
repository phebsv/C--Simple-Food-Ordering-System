using NomNom.Api.Models;

namespace NomNom.Api.Storage;

internal interface INomNomStore
{
    /// <summary>Reads a detached snapshot of the current JSON database.</summary>
    Task<NomNomData> ReadAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Runs the update against the latest snapshot under exclusive access.
    /// Returning true commits the entire snapshot in one atomic write.
    /// Returning false or throwing discards the changes.
    /// </summary>
    Task<bool> UpdateAsync(Func<NomNomData, bool> update, CancellationToken cancellationToken);
}
